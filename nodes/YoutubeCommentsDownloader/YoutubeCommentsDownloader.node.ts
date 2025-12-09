import pLimit from "../../dependecies/p-limit"
import { sleep } from "n8n-workflow"

import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow"

export class YoutubeCommentsDownloader implements INodeType {
  description: INodeTypeDescription = {
    displayName: "YouTube Comments Downloader",
    name: "youtubeCommentsDownloader",
    icon: "file:youtubeCommentsDownloader.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["contentType"]}}',
    description:
      "Download comments from YouTube videos, shorts, channels, etc.",
    defaults: {
      name: "YouTube Comments Downloader",
    },
    inputs: ["main"],
    outputs: ["main"],
    usableAsTool: true,
    credentials: [
      {
        name: "youtubeCommentsDownloaderApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "URL",
        name: "url",
        type: "string",
        default: "",
        placeholder: "https://www.youtube.com/watch?v=...",
        required: true,
        description: "URL of the YouTube content",
      },
      {
        displayName: "Content Type",
        name: "contentType",
        type: "options",
        options: [
          { name: "Channel", value: "channel" },
          { name: "Community", value: "community" },
          { name: "Custom List", value: "custom-list" },
          { name: "Live", value: "live" },
          { name: "Playlist", value: "playlist" },
          { name: "Short", value: "short" },
          { name: "Video", value: "video" },
        ],
        default: "video",
        required: true,
        description: "Type of YouTube content to download comments from",
      },
      {
        displayName: "Return Format",
        name: "returnFormat",
        type: "options",
        options: [
          {
            name: "JSON Data",
            value: "json",
            description: "Returns parsed comments directly in the workflow",
          },
          {
            name: "File Download",
            value: "file",
            description: "Returns the result as a file attachment",
          },
        ],
        default: "json",
        description: "Format of the output",
      },
      {
        displayName: "File Format",
        name: "fileFormat",
        type: "options",
        displayOptions: {
          show: {
            returnFormat: ["file"],
          },
        },
        options: [
          { name: "CSV", value: "text/csv" },
          {
            name: "Excel",
            value:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
          { name: "HTML", value: "text/html" },
          { name: "JSON", value: "application/json" },
          { name: "Text", value: "text/plain" },
        ],
        default: "application/json",
        description:
          "Format to download the file in. Note: For bulk downloads (Channel, Playlist, etc.), this determines the format of the files inside the returned ZIP archive.",
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const credentials = await this.getCredentials(
      "youtubeCommentsDownloaderApi",
    )
    const apiKey = credentials.apiKey as string
    const baseUrl = credentials.baseUrl as string
    const ignoreSslIssues = credentials.ignoreSslIssues as boolean

    const limit = pLimit(5)
    const pollInterval = 5000 // 5 seconds

    const promises = items.map((item, i) => {
      return limit(async () => {
        try {
          const url = this.getNodeParameter("url", i) as string
          const contentType = this.getNodeParameter("contentType", i) as string
          const returnFormat = this.getNodeParameter(
            "returnFormat",
            i,
          ) as string

          // 1. Start Job
          const startResponse = await this.helpers.httpRequest({
            method: "POST",
            baseURL: baseUrl,
            url: "/v1/downloads",
            body: {
              url,
              contentType,
            },
            headers: {
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
            json: true,
            skipSslCertificateValidation: ignoreSslIssues,
          })

          const downloadId = startResponse.id

          // 2. Poll for Completion
          let status = startResponse.status
          while (["created", "downloading"].includes(status)) {
            await sleep(pollInterval)
            const statusResponse = await this.helpers.httpRequest({
              method: "GET",
              baseURL: baseUrl,
              url: `/v1/downloads/${downloadId}`,
              headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
              },
              json: true,
              skipSslCertificateValidation: ignoreSslIssues,
            })
            status = statusResponse.status

            // If status is finished or error, we stop polling and proceed to get result.
            // Note: Even if 'error', we try to fetch whatever we can.
            if (["finished", "error"].includes(status)) {
              break
            }
          }

          // 3. Retrieve Results
          if (returnFormat === "json") {
            const saveResponse = await this.helpers.httpRequest({
              method: "GET",
              baseURL: baseUrl,
              url: `/v1/downloads/${downloadId}/save`,
              headers: {
                "x-api-key": apiKey,
                Accept: "application/json",
              },
              encoding: "arraybuffer", // Get raw buffer to check content type
              returnFullResponse: true,
              skipSslCertificateValidation: ignoreSslIssues,
            })

            const buffer = saveResponse.body as Buffer
            const contentTypeHeader = saveResponse.headers["content-type"] || ""

            // If it's NOT JSON (e.g. ZIP), return as binary to avoid crashing
            if (!contentTypeHeader.includes("application/json")) {
              const binaryData = await this.helpers.prepareBinaryData(
                buffer,
                `download_${downloadId}.zip`, // Assuming zip if not json for bulk, or just unknown
                contentTypeHeader as string,
              )
              returnData.push({
                json: {
                  success: true,
                  downloadId,
                  url,
                  warning:
                    "Returned content is not JSON (likely ZIP archive). Returning as binary file.",
                  status,
                },
                binary: {
                  data: binaryData,
                },
                pairedItem: { item: i },
              })
            } else {
              // Plain JSON
              const jsonString = buffer.toString("utf8")
              const jsonData = JSON.parse(jsonString)

              if (Array.isArray(jsonData)) {
                jsonData.forEach((comment: IDataObject) => {
                  returnData.push({
                    json: comment,
                    pairedItem: { item: i },
                  })
                })
              } else {
                returnData.push({
                  json: jsonData,
                  pairedItem: { item: i },
                })
              }
            }
          } else {
            // returnFormat === 'file'
            const fileFormat = this.getNodeParameter("fileFormat", i) as string
            const saveResponse = await this.helpers.httpRequest({
              method: "GET",
              baseURL: baseUrl,
              url: `/v1/downloads/${downloadId}/save`,
              headers: {
                "x-api-key": apiKey,
                Accept: fileFormat,
              },
              encoding: "arraybuffer",
              returnFullResponse: true,
              skipSslCertificateValidation: ignoreSslIssues,
            })

            const data = saveResponse.body as Buffer

            // If user asked for CSV but we got a ZIP (bulk download), extension should be .zip
            const contentTypeHeader =
              (saveResponse.headers["content-type"] as string) || ""
            const isZip = contentTypeHeader.includes("zip")

            const fileName = isZip
              ? `download_${downloadId}.zip`
              : `download_${downloadId}.${getExtension(fileFormat)}`

            const binaryData = await this.helpers.prepareBinaryData(
              data,
              fileName,
              contentTypeHeader || fileFormat,
            )

            returnData.push({
              json: {
                success: true,
                downloadId,
                url,
                status,
              },
              binary: {
                data: binaryData,
              },
              pairedItem: { item: i },
            })
          }
        } catch (error) {
          if (this.continueOnFail()) {
            returnData.push({
              json: { error: error.message },
              pairedItem: { item: i },
            })
            return
          }
          throw error
        }
      })
    })

    await Promise.all(promises)
    return [returnData]
  }
}

function getExtension(mime: string): string {
  switch (mime) {
    case "application/json":
      return "json"
    case "text/csv":
      return "csv"
    case "text/html":
      return "html"
    case "text/plain":
      return "txt"
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx"
    case "application/zip":
      return "zip"
    default:
      return "bin"
  }
}

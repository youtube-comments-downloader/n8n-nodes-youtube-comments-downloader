import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
  sleep,
} from "n8n-workflow"
import { limiter } from "./utils/limiter"

import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
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
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
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
    const baseUrl = credentials.baseUrl as string
    const ignoreSslIssues = credentials.ignoreSslIssues as boolean

    const limitTask = limiter(5)
    const pollInterval = 5000

    const operations = items.map((_, i) =>
      limitTask(async () => {
        try {
          const url = this.getNodeParameter("url", i) as string
          const contentType = this.getNodeParameter("contentType", i) as string
          const returnFormat = this.getNodeParameter(
            "returnFormat",
            i,
          ) as string

          const startResponse = (await apiRequest.call(this, {
            method: "POST",
            baseURL: baseUrl,
            url: "/v1/downloads",
            body: {
              url,
              contentType,
            },
            headers: {
              "Content-Type": "application/json",
            },
            json: true,
            skipSslCertificateValidation: ignoreSslIssues,
          })) as DownloadJobResponse

          const downloadId = startResponse.id
          let status = startResponse.status
          let statusResponse = startResponse

          while (["created", "downloading"].includes(status)) {
            await sleep(pollInterval)
            statusResponse = (await apiRequest.call(this, {
              method: "GET",
              baseURL: baseUrl,
              url: `/v1/downloads/${downloadId}`,
              headers: {
                "Content-Type": "application/json",
              },
              json: true,
              skipSslCertificateValidation: ignoreSslIssues,
            })) as DownloadJobResponse
            status = statusResponse.status

            if (["finished", "error", "canceled"].includes(status)) {
              break
            }
          }

          if (status === "error" || status === "canceled") {
            throw new NodeOperationError(
              this.getNode(),
              getDownloadErrorMessage(statusResponse, downloadId),
              { itemIndex: i },
            )
          }

          if (returnFormat === "json") {
            const saveResponse = (await apiRequest.call(this, {
              method: "GET",
              baseURL: baseUrl,
              url: `/v1/downloads/${downloadId}/save`,
              headers: {
                Accept: "application/json",
              },
              encoding: "arraybuffer",
              returnFullResponse: true,
              skipSslCertificateValidation: ignoreSslIssues,
            })) as BinaryHttpResponse

            const buffer = saveResponse.body
            const contentTypeHeader = getContentTypeHeader(saveResponse.headers)

            if (!contentTypeHeader.includes("application/json")) {
              const binaryData = await this.helpers.prepareBinaryData(
                buffer,
                `download_${downloadId}.zip`,
                contentTypeHeader,
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
                  json: jsonData as IDataObject,
                  pairedItem: { item: i },
                })
              }
            }
          } else {
            const fileFormat = this.getNodeParameter("fileFormat", i) as string
            const fileExtension = getExtension(fileFormat)
            const saveResponse = (await apiRequest.call(this, {
              method: "GET",
              baseURL: baseUrl,
              url: `/v1/downloads/${downloadId}/save`,
              qs: {
                format: fileExtension,
              },
              headers: {
                Accept: fileFormat,
              },
              encoding: "arraybuffer",
              returnFullResponse: true,
              skipSslCertificateValidation: ignoreSslIssues,
            })) as BinaryHttpResponse

            const contentTypeHeader = getContentTypeHeader(saveResponse.headers)
            const isZip = contentTypeHeader.includes("zip")
            const fileName = isZip
              ? `download_${downloadId}.zip`
              : `download_${downloadId}.${fileExtension}`

            const binaryData = await this.helpers.prepareBinaryData(
              saveResponse.body,
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
      }),
    )

    await Promise.all(operations)

    return [returnData]
  }
}

type DownloadJobResponse = IDataObject & {
  id: string
  status: string
}

type BinaryHttpResponse = {
  body: Buffer
  headers: IDataObject
}

type ApiRequestOptions = {
  method: "GET" | "POST"
  baseURL: string
  url: string
  body?: IDataObject
  qs?: IDataObject
  headers?: IDataObject
  json?: boolean
  encoding?: "arraybuffer"
  returnFullResponse?: boolean
  skipSslCertificateValidation: boolean
}

async function apiRequest<T>(
  this: IExecuteFunctions,
  options: ApiRequestOptions,
): Promise<T> {
  try {
    return await this.helpers.httpRequestWithAuthentication.call(
      this,
      "youtubeCommentsDownloaderApi",
      options,
    )
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject)
  }
}

function getContentTypeHeader(headers: IDataObject): string {
  return (headers["content-type"] as string) || ""
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

function getDownloadErrorMessage(
  response: IDataObject,
  downloadId: string,
): string {
  const error = response.error as IDataObject | undefined
  const errorMessage = error?.message

  if (typeof errorMessage === "string" && errorMessage.length > 0) {
    return errorMessage
  }

  const status = response.status
  if (status === "canceled") {
    return `Download was canceled (ID: ${downloadId})`
  }

  return `Download failed (ID: ${downloadId})`
}

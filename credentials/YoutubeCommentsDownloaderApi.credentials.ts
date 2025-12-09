import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow"

export class YoutubeCommentsDownloaderApi implements ICredentialType {
  name = "youtubeCommentsDownloaderApi"
  displayName = "YouTube Comments Downloader API"
  documentationUrl = "https://youtubecommentsdownloader.com"
  icon = "file:youtubeCommentsDownloader.svg" as const
  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      default: "",
      typeOptions: {
        password: true,
      },
    },
    {
      displayName: "API Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.youtubecommentsdownloader.com",
      description: "Base URL of the YouTube Comments Downloader API",
      placeholder: "https://api.youtubecommentsdownloader.com",
    },
    {
      displayName: "Allow Unauthorized Certificates",
      name: "ignoreSslIssues",
      type: "boolean",
      default: false,
      description: "Whether to allow self-signed certificates",
      displayOptions: {
        show: {
          baseUrl: ["https://api.ycd.test"],
        },
      },
    },
  ]
  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        "x-api-key": "={{$credentials.apiKey}}",
      },
    },
  }
  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "/v1/user",
      method: "GET",
      headers: {
        "x-api-key": "={{$credentials.apiKey}}",
      },
      skipSslCertificateValidation: "={{$credentials.ignoreSslIssues}}",
    },
  }
}

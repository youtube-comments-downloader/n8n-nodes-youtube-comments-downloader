import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class YoutubeCommentsDownloader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'YouTube Comments Downloader',
		name: 'youtubeCommentsDownloader',
		icon: 'file:youtubeCommentsDownloader.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Download comments from YouTube videos, shorts, channels, etc.',
		defaults: {
			name: 'YouTube Comments Downloader',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'youtubeCommentsDownloaderApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Download',
						value: 'download',
					},
				],
				default: 'download',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['download'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new download job',
						action: 'Create a download',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a download job status',
						action: 'Get a download',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List download jobs',
						action: 'Get many downloads',
					},
					{
						name: 'Save File',
						value: 'save',
						description: 'Download the result file',
						action: 'Save file',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				options: [
					{ name: 'Channel', value: 'channel' },
					{ name: 'Channel Details', value: 'channel-details' },
					{ name: 'Community', value: 'community' },
					{ name: 'Community Images', value: 'community-images' },
					{ name: 'Custom List', value: 'custom-list' },
					{ name: 'Live', value: 'live' },
					{ name: 'Playlist', value: 'playlist' },
					{ name: 'Short', value: 'short' },
					{ name: 'Video', value: 'video' },
				],
				default: 'video',
				displayOptions: {
					show: {
						resource: ['download'],
						operation: ['create'],
					},
				},
				required: true,
				description: 'Type of YouTube content to download comments from',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['download'],
						operation: ['create'],
					},
				},
				required: true,
				description: 'URL of the YouTube content',
			},
			{
				displayName: 'Download ID',
				name: 'downloadId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['download'],
						operation: ['get', 'save'],
					},
				},
				required: true,
				description: 'The ID of the download job',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'CSV', value: 'text/csv' },
					{ name: 'Excel', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
					{ name: 'HTML', value: 'text/html' },
					{ name: 'JSON', value: 'application/json' },
					{ name: 'Text', value: 'text/plain' },
					{ name: 'Zip', value: 'application/zip' },
				],
				default: 'application/json',
				displayOptions: {
					show: {
						resource: ['download'],
						operation: ['save'],
					},
				},
				description: 'Format to download the file in',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['download'],
						operation: ['getAll'],
					},
				},
				description: 'Max number of results to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = await this.getCredentials('youtubeCommentsDownloaderApi');
		const apiKey = credentials.apiKey as string;
		const baseUrl = credentials.baseUrl as string;
		const ignoreSslIssues = credentials.ignoreSslIssues as boolean;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'download') {
					if (operation === 'create') {
						const contentType = this.getNodeParameter('contentType', i) as string;
						const url = this.getNodeParameter('url', i) as string;

						const body = {
							contentType,
							url,
						};

						const response = await this.helpers.httpRequest({
							method: 'POST',
							baseURL: baseUrl,
							url: '/v1/downloads',
							body,
							headers: {
								'x-api-key': apiKey,
								'Content-Type': 'application/json',
							},
							json: true,
							skipSslCertificateValidation: ignoreSslIssues,
						});

						returnData.push({ json: response });
					} else if (operation === 'get') {
						const downloadId = this.getNodeParameter('downloadId', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'GET',
							baseURL: baseUrl,
							url: `/v1/downloads/${downloadId}`,
							headers: {
								'x-api-key': apiKey,
								'Content-Type': 'application/json',
							},
							json: true,
							skipSslCertificateValidation: ignoreSslIssues,
						});

						returnData.push({ json: response });
					} else if (operation === 'getAll') {
						const limit = this.getNodeParameter('limit', i) as number;

						const response = await this.helpers.httpRequest({
							method: 'GET',
							baseURL: baseUrl,
							url: '/v1/downloads',
							qs: {
								limit,
							},
							headers: {
								'x-api-key': apiKey,
								'Content-Type': 'application/json',
							},
							json: true,
							skipSslCertificateValidation: ignoreSslIssues,
						});

						if (response.data && Array.isArray(response.data)) {
							response.data.forEach((item: IDataObject) => {
								returnData.push({ json: item });
							});
						} else {
							returnData.push({ json: response });
						}
					} else if (operation === 'save') {
						const downloadId = this.getNodeParameter('downloadId', i) as string;
						const format = this.getNodeParameter('format', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'GET',
							baseURL: baseUrl,
							url: `/v1/downloads/${downloadId}/save`,
							headers: {
								'x-api-key': apiKey,
								'Accept': format,
							},
							encoding: 'arraybuffer',
							json: false,
							returnFullResponse: true,
							skipSslCertificateValidation: ignoreSslIssues,
						});

						const data = response.body as Buffer;
						const binaryData = await this.helpers.prepareBinaryData(
							data,
							`download_${downloadId}.${getExtension(format)}`,
							format,
						);

						returnData.push({
							json: {
								success: true,
								downloadId,
							},
							binary: {
								data: binaryData,
							},
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

function getExtension(mime: string): string {
	switch (mime) {
		case 'application/json':
			return 'json';
		case 'text/csv':
			return 'csv';
		case 'text/html':
			return 'html';
		case 'text/plain':
			return 'txt';
		case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
			return 'xlsx';
		case 'application/zip':
			return 'zip';
		default:
			return 'bin';
	}
}

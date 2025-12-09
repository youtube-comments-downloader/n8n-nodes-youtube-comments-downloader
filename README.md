# n8n-nodes-youtube-comments-downloader

This is an n8n community node. It lets you use [YouTube Comments Downloader](https://youtubecommentsdownloader.com) in your n8n workflows.

The YouTube Comments Downloader node allows you to easily export comments from YouTube videos, shorts, channels, playlists, and more directly within your n8n automation pipelines.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)

## Installation

To install this node in your n8n instance:

1.  Go to **Settings** > **Community Nodes**.
2.  Click **Install**.
3.  Paste the package name: `n8n-nodes-youtube-comments-downloader`
4.  Click **Install** again.

For more detailed instructions or troubleshooting, refer to the [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/installation/).

## Operations

This node supports the following operations:

- **Download Comments**: Fetch comments from various YouTube content types.
  - **Content Types**:
    - Video
    - Short
    - Channel
    - Playlist
    - Community Posts
    - Live Streams
    - Custom Lists
  - **Return Formats**:
    - **JSON Data**: Returns parsed comments directly in the workflow for further processing.
    - **File Download**: Returns the result as a binary file attachment. Supported formats include:
      - JSON
      - CSV
      - Excel (XLSX)
      - HTML
      - Text
      - _Note: Bulk downloads (e.g., Channels, Playlists) may return a ZIP archive containing multiple files._

## Credentials

You need an API Key from [YouTube Comments Downloader](https://youtubecommentsdownloader.com) to use this node.

1.  Sign up or log in at [youtubecommentsdownloader.com](https://youtubecommentsdownloader.com).
2.  Obtain your **API Key** from the dashboard.
3.  In n8n, create a new credential for **YouTube Comments Downloader API**.
4.  Enter your API Key.
5.  (Optional) You can configure a custom API Base URL if needed (default is `https://api.youtubecommentsdownloader.com`).

## Compatibility

This node works with n8n version 1.x and the 2.x beta branch.

## Usage

1.  Add the **YouTube Comments Downloader** node to your workflow.
2.  Select your credentials.
3.  Enter the **URL** of the YouTube content you want to scrape (e.g., a video link, channel URL).
4.  Select the **Content Type** that matches your URL (e.g., `Video`, `Channel`).
5.  Choose your **Return Format**:
    - Select `JSON Data` if you want to process the comments immediately in the next nodes (e.g., sentiment analysis, database insertion).
    - Select `File Download` if you want to save the comments as a file (e.g., upload to Drive, email attachment).
6.  If using `File Download`, select your desired **File Format** (CSV, Excel, etc.).

### Example Workflow

- **Trigger**: On a schedule or manually.
- **YouTube Comments Downloader**: Download comments from a specific video URL as JSON.
- **Split In Batches**: Iterate over the comments.
- **Google Sheets**: Add each comment to a spreadsheet.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [YouTube Comments Downloader Website](https://youtubecommentsdownloader.com)
- [API Documentation](https://api.youtubecommentsdownloader.com)

import { Inject, Injectable } from '@nestjs/common';
import { GaxiosResponse } from 'gaxios';
import { drive_v3, google } from 'googleapis';
import { Duplex } from 'node:stream';
import { GOOGLE_DRIVE_CONFIG } from './google-drive.constant';
import {
  GDUploadFileRequest,
  GoogleDriveConfig
} from './types';
import { Logger } from '@nestjs/common';

@Injectable()
export class GoogleDriveService {
  private logger = new Logger(GoogleDriveService.name);

  constructor(
    @Inject(GOOGLE_DRIVE_CONFIG)
    private readonly googleDriveConfig: GoogleDriveConfig,
  ) {}

  /**
   * Get stream from buffer
   * @returns
   * @param buffer
   */
  static bufferToStream(buffer: Buffer) {
    const tmp = new Duplex();
    tmp.push(buffer);
    tmp.push(null);
    return tmp;
  }

  /**
   * Upload file to Google Drive
   * @return
   */
  async uploadFile(
    request: GDUploadFileRequest,
  ): Promise<GaxiosResponse<drive_v3.Schema$File>> {
    try {
      const fileMetadata = {
        name: request.fileName,
        parents: [request.folderId],
      };

      const media = {
        mimeType: request.mimeType,
        body: request.body,
      };

      const driveService = this.getDriveService();

      const response = await driveService.files.create({
        requestBody: fileMetadata,
        media,
      });
      return response
    } catch (err) {
      this.logger.error(`[${this.uploadFile.name}]:= `, err)
      throw err;
    }
  }

  /**
   * Delete file on google drive
   * @param fileId file id to delete
   */
  async deleteFile(fileId: string) {
    try {
      const drive = this.getDriveService();

      await drive.files.delete({
        fileId,
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get file URL from and existing file in google drive with the file id
   * @param fileId file id
   * @returns
   */
  async getFileURL(fileId: string) {
    const drive = this.getDriveService();

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const result = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
    });

    const fileUrl = result.data.webContentLink;

    return fileUrl;
  }

  /**
   * Ask for permission to access to Goofle Drive
   * @returns
   */
  private getAuth() {
    try {
      const { clientId, clientSecret, redirectUrl, refreshToken } =
        this.googleDriveConfig;

      const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);

      auth.setCredentials({ refresh_token: refreshToken });

      return auth;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get access to Google Drive
   * @returns
   */
  private getDriveService = () => {
    const auth = this.getAuth();

    const DRIVE_VERSION = 'v3';

    return google.drive({ version: DRIVE_VERSION, auth });
  };
}

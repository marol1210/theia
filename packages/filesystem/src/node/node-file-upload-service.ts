/********************************************************************************
 * Copyright (C) 2019 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import multer = require('multer');
import path = require('path');
import os = require('os');
import express = require('@theia/core/shared/express');
import fs = require('@theia/core/shared/fs-extra');
import { BackendApplicationContribution, FileUri } from '@theia/core/lib/node';
import { injectable } from '@theia/core/shared/inversify';
import { HTTP_FILE_UPLOAD_PATH } from '../common/file-upload';

@injectable()
export class NodeFileUploadService implements BackendApplicationContribution {

    async configure(app: express.Application): Promise<void> {
        const dest = await this.getTemporaryUploadDest();
        app.post(
            HTTP_FILE_UPLOAD_PATH,
            // `multer` handles `multipart/form-data` containing our file to upload.
            multer({ dest }).single('file'),
            (request, response, next) => this.handleFileUpload(request, response)
        );
    }

    /**
     * @returns Path to a folder where to temporarily store uploads.
     */
    protected async getTemporaryUploadDest(): Promise<string> {
        return path.join(os.tmpdir(), 'theia_upload');
    }

    protected async handleFileUpload(request: express.Request, response: express.Response): Promise<void> {
        const fields = request.body;
        if (!request.file || typeof fields !== 'object' || typeof fields.uri !== 'string') {
            response.sendStatus(400); // bad request
            return;
        }
        try {
            const target = FileUri.fsPath(fields.uri);
            await fs.move(request.file.path, target);
            response.status(200).send(target); // ok
        } catch (error) {
            console.error(error);
            response.sendStatus(500); // internal server error
        }
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRelativeGrids = toRelativeGrids;
exports.toAbsoluteGrids = toAbsoluteGrids;
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
// Convert file:// absolute paths in grids to project-relative POSIX-style paths for saving
function toRelativeGrids(grids, projectPath) {
    const result = {};
    for (const [section, images] of Object.entries(grids)) {
        result[section] = images.map((imageSlot) => {
            if (imageSlot && imageSlot.path && imageSlot.path.startsWith('file://')) {
                const filePath = url_1.default.fileURLToPath(imageSlot.path);
                const relativePath = path_1.default.relative(projectPath, filePath).replace(/\\/g, '/');
                return { ...imageSlot, path: relativePath };
            }
            return imageSlot;
        });
    }
    return result;
}
// Convert relative paths in grids to absolute paths using the project directory (no file:// prefix)
function toAbsoluteGrids(grids, projectDir) {
    const result = {};
    for (const [section, images] of Object.entries(grids)) {
        result[section] = images.map((imageSlot) => {
            if (imageSlot &&
                imageSlot.path &&
                !imageSlot.path.startsWith('file://') &&
                !path_1.default.isAbsolute(imageSlot.path)) {
                const absolutePath = path_1.default.join(projectDir, imageSlot.path);
                return { ...imageSlot, path: absolutePath };
            }
            return imageSlot;
        });
    }
    return result;
}

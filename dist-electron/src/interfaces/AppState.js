"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_APP_STATE = void 0;
exports.ensureImageSlotMetadata = ensureImageSlotMetadata;
const types_1 = require("./types");
exports.DEFAULT_APP_STATE = {
    version: 2, // bumped for expanded grid model (new sections & slot counts)
    projectName: '',
    grids: {},
    descriptions: {
        notes: '',
        faceImageDescription: '',
        clothesImageDescription: '',
        fullBodyClothesDescription: '',
        environmentDescription: '',
        loraTrigger: '',
        subjectAddition: '',
    },
    promptTemplate: '',
};
// Utility to ensure an ImageSlot has metadata (used during load/migration)
function ensureImageSlotMetadata(slot) {
    if (!slot)
        return slot;
    if (!slot.metadata) {
        return { ...slot, metadata: { ...types_1.DEFAULT_IMAGE_METADATA } };
    }
    // Ensure likeness sub-object exists
    if (!slot.metadata.likeness) {
        slot.metadata.likeness = { score: 1.0, ref: 'none' };
    }
    return slot;
}

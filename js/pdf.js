var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/// <reference path="pdfjsLib.d.ts" />
import * as math from "./math.js";
import { readFileAsync } from "./std.js";
export { canvas, wrapCanvasById, renderPdf, };
let canvas;
let context;
function wrapCanvasById(id) {
    canvas = document.getElementById(id);
    if (!canvas) {
        throw new Error();
    }
    context = canvas.getContext("2d");
    if (!context) {
        throw new Error();
    }
}
function renderPdf(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield readFileAsync(file);
        const document = yield pdfjsLib.getDocument(data).promise;
        const page = yield document.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        canvas.width = math.getNextPowerOfTwo(viewport.width);
        canvas.height = math.getNextPowerOfTwo(viewport.height);
        console.log(viewport.width, viewport.height);
        yield page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        return [viewport.width, viewport.height];
    });
}

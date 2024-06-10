/// <reference path="pdfjsLib.d.ts" />
// import * as pdfjsLib from "./pdfjsLib.js";
import * as math from "./math.js";
import * as render from "./render.js";

export {
    canvas,

    wrapCanvasById,
    renderPdf,
}

let canvas: HTMLCanvasElement | null;
let context: CanvasRenderingContext2D;

function wrapCanvasById(id: string) {
    canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) {
        throw new Error();
    }

    context = canvas.getContext("2d");
    if (!context) {
        throw new Error();
    }
}

async function renderPdf(file: File) {
    const data = await readFileAsync(file);
    const document = await pdfjsLib.getDocument(data).promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });

    canvas.width = math.getNextPowerOfTwo(viewport.width);
    canvas.height = math.getNextPowerOfTwo(viewport.height);

    console.log(viewport.width, viewport.height);

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;
}


function readFileAsync(file: File): Promise<string | ArrayBuffer> {
    return new Promise<string | ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        }
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

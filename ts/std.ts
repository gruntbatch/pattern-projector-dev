export {
    readFileAsync
};

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

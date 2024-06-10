export {
    compareArrays,
    readFileAsync,
};

function compareArrays(a: Array<any>, b: Array<any>): boolean {
    if (!a || !b) {
        return false;
    }

    if (a == b) {
        return true;
    }

    if (a.length != b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i += 1) {
        if (a[i] != b[i]) {
            return false;
        }
    }

    return true;
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

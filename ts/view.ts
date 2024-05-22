export {
    Button
};

class Button {
    e: HTMLElement;

    constructor(id: string, onclick) {
        this.e = document.getElementById(id);
        this.e.onclick = onclick;
    }
}

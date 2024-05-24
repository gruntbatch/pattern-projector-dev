import * as model from "./model.js";

export {
    Editor,
    Scalar,
};

class Editor {
    model: model.Model;

    constructor(model: model.Model) {
        this.model = model;

        for (let e of document.getElementsByClassName("drawer")) {
            (e.firstElementChild as HTMLElement).onclick = () => {
                e.classList.toggle("collapsed");
            }
        }

        new Scalar(model.precision, document.getElementById("precision-field"));
    }
}

class Scalar {
    value: model.Scalar;
    e: HTMLElement;
    display: HTMLElement;

    constructor(value: model.Scalar, e: HTMLElement) {
        this.value = value;

        this.e = e;
        this.display = e.querySelector<HTMLElement>("#display");
        this.view();

        this.e.onwheel = (e) => {
            this.value.update(e.deltaY * 0.001);
            this.view();
        };

        e.querySelector<HTMLElement>("#reset").onclick = () => {
            this.value.reset();
            this.view();
        };
    }

    view() {
        this.display.innerText = this.value.get().toFixed(3);
    }
}

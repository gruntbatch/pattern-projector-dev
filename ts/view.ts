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
        new Point(model.origin, model.precision, document.getElementById("origin-field"));
    }
}

const SCROLL_SCALAR = 0.001;

class Point {
    value: model.Point;
    scalar: model.Scalar;
    displayX: HTMLElement;
    displayY: HTMLElement;

    constructor(value: model.Point, scalar: model.Scalar, e: HTMLElement) {
        this.value = value;
        this.scalar = scalar;

        this.displayX = e.querySelector<HTMLElement>("#display-x");
        this.displayY = e.querySelector<HTMLElement>("#display-y");
        this.view();

        e.querySelector<HTMLElement>("#field-x").onwheel = (e) => {
            this.value.x.update(e.deltaY * this.scalar.get());
            this.view();
        }

        e.querySelector<HTMLElement>("#field-y").onwheel = (e) => {
            this.value.y.update(e.deltaY * this.scalar.get());
            this.view();
        }

        e.querySelector<HTMLElement>("#reset").onclick = () => {
            this.value.x.reset();
            this.value.y.reset();
            this.view();
        }
    }

    view() {
        this.displayX.innerText = this.value.x.get().toFixed(3);
        this.displayY.innerText = this.value.y.get().toFixed(3);
    }
}

class Scalar {
    value: model.Scalar;
    display: HTMLElement;

    constructor(value: model.Scalar, e: HTMLElement) {
        this.value = value;

        this.display = e.querySelector<HTMLElement>("#display");
        this.view();

        e.onwheel = (e) => {
            this.value.update(e.deltaY * SCROLL_SCALAR);
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

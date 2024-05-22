import * as model from "./model.js";
import * as view from "./view.js";

export {
    Editor
};

class Editor {
    model: model.Model;

    randomizeOrigin;
    resetOrigin;

    constructor(model: model.Model) {
        this.model = model;

        this.randomizeOrigin = new view.Button("randomize-origin", () => {
            this.model.origin[0] = Math.random() * 100 - 50;
            this.model.origin[1] = Math.random() * 100 - 50;
        });
        this.resetOrigin = new view.Button("reset-origin", () => {
            this.model.origin[0] = 0;
            this.model.origin[1] = 0;
        });
    }
}

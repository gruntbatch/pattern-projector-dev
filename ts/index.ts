import * as model from "./model.js";
import * as render from "./render.js";
import * as view from "./view.js";

(() => {
    const myModel = new model.Model(
        Math.min(window.innerWidth, window.innerHeight) / 4
    );

    render.wrapCanvasById("gl-canvas");
    const buffer = new render.Buffer();
    // TODO: Replace with buffer.circle() or something
    const mTriangle = buffer.newMesh([
        render.newVertex([-2, -2]),
        render.newVertex([0, 2]),
        render.newVertex([2, -2])
    ]);
    const mPlane = buffer.newPlane(1, [-1, -1], [3, 3]);
    const pHello = new render.Program(
        "glsl/standard.vert",
        "glsl/solid.frag",
        [["u_color", [1, 0, 0, 1]]]
    );
    const pRuler = new render.Program(
        "glsl/standard.vert",
        "glsl/ruler.frag",
        [
            ["u_color", [0, 0, 1, 1]],
            ["u_distance", [myModel.corners[0].distanceTo(myModel.corners[1])]],
            ["u_resolution", [myModel.unitsPerQuad.get()]],
            ["u_width", [4.0]]
        ]
    );

    const onResize = () => {
        let width = window.innerWidth;
        let height = window.innerHeight;
        render.onResize(width, height);
        // TODO: Model needs to resize so that when you reset a corner it goes to a reasonable place
        // myModel.onResize(width, height);
    }
    onResize();
    window.onresize = onResize;

    const myEditor = new view.Editor(myModel, render.canvas);

    const onAnimationFrame = () => {
        mPlane.draw(
            pRuler,
            render.newSkewMatrix(
                [[1, 1], [0, 1], [0, 0], [1, 0]],
                myModel.getCornersAsVectors()
            ),
            [
                ["u_distance", [myModel.corners[0].distanceTo(myModel.corners[1])]],
                ["u_resolution", [myModel.unitsPerQuad.get()]],
                ["u_width", [myModel.pixelsPerLine.get()]],
            ]
        );
        for (const corner of myModel.corners) {
            mTriangle.draw(pHello, render.newTranslationMatrix(corner.getVector2()));
        }
        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();

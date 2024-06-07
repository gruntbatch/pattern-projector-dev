import * as math from "./math.js";
import * as model from "./model.js";
import * as render from "./render.js";
import * as view from "./view.js";

(() => {
    const myModel = new model.Model(
        Math.min(window.innerWidth, window.innerHeight) / 8
    );

    render.wrapCanvasById("gl-canvas");
    const buffer = new render.Buffer();
    const mRuler = buffer.newPlane([-1, -1], [3, 3]);
    const mPattern = buffer.newPlane();
    const pHello = new render.Program(
        "glsl/standard.vert",
        "glsl/solid.frag",
        [["u_color", [1, 0, 0, 1]]]
    );
    const pRuler = new render.Program(
        "glsl/standard.vert",
        "glsl/ruler.frag",
        [
            ["u_color", [0, 0, 0, 1]],
            ["u_background_color", [1, 1, 1, 1]],
            ["u_distance", [myModel.corners[0].distanceTo(myModel.corners[1])]],
            ["u_resolution", [myModel.unitsPerQuad.get()]],
            ["u_width", [4.0]]
        ]
    );
    const pPattern = new render.Program(
        "glsl/standard.vert",
        "glsl/pattern.frag",
        [
            ["u_texture", [0]]
        ]
    );
    const tRuler = new render.Texture();
    tRuler.fromImageUrl("assets/ruler.png");

    const myEditor = new view.Editor(myModel, render.canvas);

    const onResize = () => {
        let width = window.innerWidth;
        let height = window.innerHeight;
        render.onResize(width, height);
        myEditor.onResize(width, height);
        // TODO: Model needs to resize so that when you reset a corner it goes to a reasonable place
        // myModel.onResize(width, height);
    }
    onResize();
    window.onresize = onResize;

    const onAnimationFrame = () => {
        const skew = math.Matrix4.skew(
            [
                new math.Vector2([1, 1]),
                new math.Vector2([0, 1]),
                new math.Vector2([0, 0]),
                new math.Vector2([1, 0])
            ],
            myModel.getCornersAsVectors(),
        )

        render.setView(skew);

        switch (myModel.displayMode) {
            case model.DisplayMode.Ruler:
                mRuler.draw(
                    pRuler,
                    new math.Matrix4(),
                    [
                        ["u_distance", [myModel.corners[0].distanceTo(myModel.corners[1])]],
                        ["u_resolution", [myModel.unitsPerQuad.get()]],
                        ["u_width", [myModel.pixelsPerLine.get()]],
                    ]
                );
                break;

            case model.DisplayMode.Pattern:
                const skew = math.Matrix4.skew(
                    myModel.getCornersAsVectors(),
                    [
                        new math.Vector2([1, 1]),
                        new math.Vector2([0, 1]),
                        new math.Vector2([0, 0]),
                        new math.Vector2([1, 0])
                    ],
                )
                let origin2 = myModel.origin.getVector2();
                let origin4 = new math.Vector4([origin2.buffer[0], origin2.buffer[1], 0, 1]);
                origin4 = origin4.mul(skew);
                origin2 = new math.Vector2([origin4.buffer[0], origin4.buffer[1]]);
                tRuler.bind();
                mPattern.draw(
                    pPattern,
                    math.Matrix4.model(origin2, myModel.scale),
                );
                break;
        }

        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
})();

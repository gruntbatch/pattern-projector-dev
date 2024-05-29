precision mediump float;

varying vec2 v_texCoord;

uniform vec4 u_color;
uniform float u_distance;
uniform float u_resolution;
uniform float u_width;

float grid(vec2 uv, float res, float width) {
    vec2 grid = fract(uv * res);
    return step(width, grid.x) * step(width, grid.y);
}

void main() {
    vec2 texCoord = v_texCoord;
    float distance = u_distance / u_width;
    float factor = grid(
        texCoord,
        u_resolution,
        (1.0 / (distance / u_resolution))
    );
    gl_FragColor = vec4(u_color.xyz * factor, 1);
}

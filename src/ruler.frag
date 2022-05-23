#version 300 es
precision mediump float;

in vec4 inout_color;
in vec2 inout_uv;

out vec4 out_color;

float grid(vec2 uv, float res) {
    vec2 grid = fract(uv * res);
    return (step(res, grid.x) * step(res, grid.y));
}

void main(void) {
    vec2 uv = inout_uv * 128.0;
    float x = grid(uv, 0.1);
    vec3 color = inout_color.xyz;
    out_color = vec4(color * x, 1);
}

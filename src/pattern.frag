#version 300 es
precision mediump float;

in vec4 inout_color;
in vec2 inout_uv;

uniform sampler2D uni_texture;

out vec4 out_color;

void main(void) {
    out_color = texture(uni_texture, vec2(inout_uv.x, -inout_uv.y));
}

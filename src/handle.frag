#version 300 es
precision mediump float;

uniform vec4 in_color;

out vec4 out_color;

void main(void) {
    out_color = in_color;
}

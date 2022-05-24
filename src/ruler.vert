#version 300 es
precision mediump float;

layout (std140) uniform Matrices {
    mat4 projection;
    mat4 view;
    mat4 model;
};

uniform mat4 in_bones[4];

layout (location=0) in vec2 in_position;
layout (location=1) in vec2 in_uv;
layout (location=2) in vec4 in_color;
layout (location=3) in vec4 in_weights;

out vec4 inout_color;
out vec2 inout_uv;

void main(void) {
    gl_Position = projection * view * model * vec4(in_position, 1, 1);
    inout_color = in_color;
    inout_uv = in_uv;
}

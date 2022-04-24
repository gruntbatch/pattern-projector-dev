#version 300 es
precision mediump float;

layout (std140) uniform Matrices {
    mat4 projection;
    mat4 view;
    mat4 model;
};

layout (location=0) in vec2 in_position;

void main(void) {
    gl_Position = projection * view * model * vec4(in_position, 1.0, 1.0);
}

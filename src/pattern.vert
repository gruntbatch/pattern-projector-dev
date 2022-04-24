#version 300 es
precision mediump float;

layout (std140) uniform Matrices {
    mat4 projection;
    mat4 view;
    mat4 model;
};

uniform mat4 in_bones[4];

layout (location=0) in vec2 in_position;
layout (location=1) in vec4 in_weights;
layout (location=2) in vec2 in_uv;

out vec4 inout_color;
out vec2 inout_uv;

void main(void) {
    vec4 position = vec4(0.0);
    for (int i=0; i<4; i++) {
        vec4 vertex_position = vec4(in_position, 1.0, 1.0);
        position += (in_bones[i] * vertex_position) * in_weights[i];
    }
    gl_Position = projection * view * model * position;
    inout_color = in_weights;
    inout_uv = in_uv;
}

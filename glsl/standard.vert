precision mediump float;

attribute vec2 a_position;
attribute vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0, 1.0);
}

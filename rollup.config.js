import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "./ifcjs/WIVGLTF/app.js",
  output: [
    {
      format: "esm",
      file: "./ifcjs/WIVGLTF/bundle.js",
    },
  ],
  plugins: [resolve(), commonjs()],
};

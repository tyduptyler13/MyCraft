#!/bin/sh

compiler.jar --js dev/js/Thread.js --js dev/js/SkyShader.js --js dev/js/Voxel.js --js dev/js/Player.js --js dev/js/Interface.js --js dev/js/game.js --language_in ES6_STRICT --language_out ES5_STRICT --js_output_file release/js/MyCraft.min.js || echo "Failed to build MyCraft"
compiler.jar --js dev/js/ChunkOptimizer.js --language_in ES6_STRICT --language_out ES5_STRICT --js_output_file release/js/ChunkOptimizer.min.js || echo "Failed to build ChunkOptimizer"
sed -i 's/ChunkOptimizer\.js/ChunkOptimizer.min.js/g' release/js/MyCraft.min.js


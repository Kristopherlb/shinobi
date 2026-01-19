// vitest.config.ts
import { defineConfig } from "file:///Users/kristopherbowles/project42/shinobi/node_modules/.pnpm/vitest@2.1.9_@types+node@24.10.4_terser@5.44.1/node_modules/vitest/dist/config.js";
import { nxViteTsPaths } from "file:///Users/kristopherbowles/project42/shinobi/node_modules/.pnpm/@nx+vite@21.6.10_@babel+traverse@7.28.5_@swc+core@1.15.8_nx@21.6.10_@swc+core@1.15.8__t_013927a72d958ebb3ea20ccf9276406d/node_modules/@nx/vite/plugins/nx-tsconfig-paths.plugin.js";
var vitest_config_default = defineConfig({
  plugins: [nxViteTsPaths({ debug: false })],
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"]
    },
    server: {
      deps: {
        inline: [
          "@aws/lambda-invoke-store"
        ]
      }
    }
  },
  resolve: {
    // Vitest natively respects package.json exports including 'development' condition
    // No moduleNameMapper needed!
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rcmlzdG9waGVyYm93bGVzL3Byb2plY3Q0Mi9zaGlub2JpL3BhY2thZ2VzL2NvbXBvbmVudHMvYWktcHJvdmlkZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9rcmlzdG9waGVyYm93bGVzL3Byb2plY3Q0Mi9zaGlub2JpL3BhY2thZ2VzL2NvbXBvbmVudHMvYWktcHJvdmlkZXIvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMva3Jpc3RvcGhlcmJvd2xlcy9wcm9qZWN0NDIvc2hpbm9iaS9wYWNrYWdlcy9jb21wb25lbnRzL2FpLXByb3ZpZGVyL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCB7IG54Vml0ZVRzUGF0aHMgfSBmcm9tICdAbngvdml0ZS9wbHVnaW5zL254LXRzY29uZmlnLXBhdGhzLnBsdWdpbic7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtueFZpdGVUc1BhdGhzKHsgZGVidWc6IGZhbHNlIH0pXSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdub2RlJyxcbiAgICBpbmNsdWRlOiBbJyoqLyoue3Rlc3Qsc3BlY30ue3RzLHRzeH0nXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCddLFxuICAgICAgaW5jbHVkZTogWydzcmMvKiovKi57dHMsdHN4fSddLFxuICAgICAgZXhjbHVkZTogWydzcmMvKiovKi5kLnRzJ11cbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgZGVwczoge1xuICAgICAgICBpbmxpbmU6IFtcbiAgICAgICAgICAnQGF3cy9sYW1iZGEtaW52b2tlLXN0b3JlJ1xuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgLy8gVml0ZXN0IG5hdGl2ZWx5IHJlc3BlY3RzIHBhY2thZ2UuanNvbiBleHBvcnRzIGluY2x1ZGluZyAnZGV2ZWxvcG1lbnQnIGNvbmRpdGlvblxuICAgIC8vIE5vIG1vZHVsZU5hbWVNYXBwZXIgbmVlZGVkIVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVosU0FBUyxvQkFBb0I7QUFDOWEsU0FBUyxxQkFBcUI7QUFFOUIsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLGNBQWMsRUFBRSxPQUFPLE1BQU0sQ0FBQyxDQUFDO0FBQUEsRUFDekMsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsU0FBUyxDQUFDLDJCQUEyQjtBQUFBLElBQ3JDLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVMsQ0FBQyxtQkFBbUI7QUFBQSxNQUM3QixTQUFTLENBQUMsZUFBZTtBQUFBLElBQzNCO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsUUFDSixRQUFRO0FBQUEsVUFDTjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQTtBQUFBO0FBQUEsRUFHVDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

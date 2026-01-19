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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rcmlzdG9waGVyYm93bGVzL3Byb2plY3Q0Mi9zaGlub2JpL3BhY2thZ2VzL2NvbXBvbmVudHMvYXBpLWdhdGV3YXktcmVzdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2tyaXN0b3BoZXJib3dsZXMvcHJvamVjdDQyL3NoaW5vYmkvcGFja2FnZXMvY29tcG9uZW50cy9hcGktZ2F0ZXdheS1yZXN0L3ZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2tyaXN0b3BoZXJib3dsZXMvcHJvamVjdDQyL3NoaW5vYmkvcGFja2FnZXMvY29tcG9uZW50cy9hcGktZ2F0ZXdheS1yZXN0L3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCB7IG54Vml0ZVRzUGF0aHMgfSBmcm9tICdAbngvdml0ZS9wbHVnaW5zL254LXRzY29uZmlnLXBhdGhzLnBsdWdpbic7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtueFZpdGVUc1BhdGhzKHsgZGVidWc6IGZhbHNlIH0pXSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdub2RlJyxcbiAgICBpbmNsdWRlOiBbJyoqLyoue3Rlc3Qsc3BlY30ue3RzLHRzeH0nXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCddLFxuICAgICAgaW5jbHVkZTogWydzcmMvKiovKi57dHMsdHN4fSddLFxuICAgICAgZXhjbHVkZTogWydzcmMvKiovKi5kLnRzJ10sXG4gICAgfSxcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIC8vIFZpdGVzdCBuYXRpdmVseSByZXNwZWN0cyBwYWNrYWdlLmpzb24gZXhwb3J0cyBpbmNsdWRpbmcgJ2RldmVsb3BtZW50JyBjb25kaXRpb25cbiAgICAvLyBObyBtb2R1bGVOYW1lTWFwcGVyIG5lZWRlZCFcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnYSxTQUFTLG9CQUFvQjtBQUM3YixTQUFTLHFCQUFxQjtBQUU5QixJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsY0FBYyxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUM7QUFBQSxFQUN6QyxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixTQUFTLENBQUMsMkJBQTJCO0FBQUEsSUFDckMsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDakMsU0FBUyxDQUFDLG1CQUFtQjtBQUFBLE1BQzdCLFNBQVMsQ0FBQyxlQUFlO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUE7QUFBQTtBQUFBLEVBR1Q7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

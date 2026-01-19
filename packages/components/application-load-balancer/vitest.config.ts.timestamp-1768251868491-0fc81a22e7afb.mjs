// vitest.config.ts
import { defineConfig } from "file:///Users/kristopherbowles/project42/shinobi/node_modules/.pnpm/vitest@2.1.9_@types+node@24.10.4_terser@5.44.1/node_modules/vitest/dist/config.js";
import { nxViteTsPaths } from "file:///Users/kristopherbowles/project42/shinobi/node_modules/.pnpm/@nx+vite@21.6.10_@babel+traverse@7.28.5_@swc+core@1.15.8_nx@21.6.10_@swc+core@1.15.8__t_013927a72d958ebb3ea20ccf9276406d/node_modules/@nx/vite/plugins/nx-tsconfig-paths.plugin.js";
var vitest_config_default = defineConfig({
  plugins: [nxViteTsPaths()],
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rcmlzdG9waGVyYm93bGVzL3Byb2plY3Q0Mi9zaGlub2JpL3BhY2thZ2VzL2NvbXBvbmVudHMvYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2tyaXN0b3BoZXJib3dsZXMvcHJvamVjdDQyL3NoaW5vYmkvcGFja2FnZXMvY29tcG9uZW50cy9hcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyL3ZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2tyaXN0b3BoZXJib3dsZXMvcHJvamVjdDQyL3NoaW5vYmkvcGFja2FnZXMvY29tcG9uZW50cy9hcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCB7IG54Vml0ZVRzUGF0aHMgfSBmcm9tICdAbngvdml0ZS9wbHVnaW5zL254LXRzY29uZmlnLXBhdGhzLnBsdWdpbic7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtueFZpdGVUc1BhdGhzKCldLFxuICB0ZXN0OiB7XG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLFxuICAgIGluY2x1ZGU6IFsnKiovKi57dGVzdCxzcGVjfS57dHMsdHN4fSddLFxuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JyxcbiAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbicsICdodG1sJ10sXG4gICAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qLnt0cyx0c3h9J10sXG4gICAgICBleGNsdWRlOiBbJ3NyYy8qKi8qLmQudHMnXSxcbiAgICB9LFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgLy8gVml0ZXN0IG5hdGl2ZWx5IHJlc3BlY3RzIHBhY2thZ2UuanNvbiBleHBvcnRzIGluY2x1ZGluZyAnZGV2ZWxvcG1lbnQnIGNvbmRpdGlvblxuICAgIC8vIE5vIG1vZHVsZU5hbWVNYXBwZXIgbmVlZGVkIVxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTJiLFNBQVMsb0JBQW9CO0FBQ3hkLFNBQVMscUJBQXFCO0FBRTlCLElBQU8sd0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxjQUFjLENBQUM7QUFBQSxFQUN6QixNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixTQUFTLENBQUMsMkJBQTJCO0FBQUEsSUFDckMsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDakMsU0FBUyxDQUFDLG1CQUFtQjtBQUFBLE1BQzdCLFNBQVMsQ0FBQyxlQUFlO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUE7QUFBQTtBQUFBLEVBR1Q7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

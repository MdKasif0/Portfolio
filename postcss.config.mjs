const config = {
  plugins: {
    tailwindcss: {},
    // Adds the light theme: a light twin of every colour rule in app/globals.css.
    "./tools/postcss/light-scheme.cjs": {},
    autoprefixer: {}
  }
};

export default config;

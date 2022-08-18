
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["*.{html,js}"],
  purge: ["*.{html,js}"],
  theme: {
    extend: {
      backgroundImage: {
        'landscape': "url('/images/landscape.svg')",
        'RollingHills': "url('/images/RollingHills.svg')",
        'airplane': "url('/images/airplane.svg')",
      },
      minHeight: (theme) => ({
        ...theme('spacing'),
      }),
      fontFamily: {
        sans: [
          'Helvetica',
          ...defaultTheme.fontFamily.sans,
        ],
      },
    }
  },
  plugins: [require("daisyui")],

    // daisyUI config (optional)
    daisyui: {
      styled: true,
      themes: true,
      base: true,
      utils: true,
      logs: true,
      rtl: false,
      prefix: "",
      darkTheme: "forest",
      themes:["emerald"],
    },
}


const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["*.{html,js}"],
  purge: ["*.{html,js}"],
  theme: {
    extend: {
      backgroundImage: {
        'RollingHills': "url('/images/RollingHillsWithElements.svg')",
        'RollingHills_smallScreen': "url('/images/RollingHillsWithElements_smallScreen.svg')",
      },
      minHeight: (theme) => ({
        ...theme('spacing'),
      }),
      fontFamily: {
        sans: [
          'Helvetica', 'FreeSans',
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

module.exports = function (cfg) {
  cfg.addPassthroughCopy("css");
  cfg.addPassthroughCopy("js");
  cfg.addPassthroughCopy("images");

  return {
    dir: {
      input: "src",
      includes: "_partials",
      layouts: "_layouts",
      output: "public"
    },
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};

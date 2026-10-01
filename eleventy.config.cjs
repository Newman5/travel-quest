module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/assets');

  return {
    pathPrefix: '/travel-quest/',
    dir: {
      input: 'src',
      output: 'dist'
    }
  };
};

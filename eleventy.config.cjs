const normalizeBasePath = (value) => {
  if (!value) return '/travel-quest/';
  if (value === '/') return '/travel-quest/';
  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname || '/travel-quest/';
    return pathname === '/' ? '/travel-quest/' : pathname.replace(/\/?$/, '/');
  } catch {
    const normalized = value.replace(/\/?$/, '/');
    return normalized === '/' ? '/travel-quest/' : normalized;
  }
};

const baseUrl = normalizeBasePath(process.env.BASE_URL);

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/assets');

  return {
    pathPrefix: baseUrl,
    dir: {
      input: 'src',
      output: 'dist'
    }
  };
};

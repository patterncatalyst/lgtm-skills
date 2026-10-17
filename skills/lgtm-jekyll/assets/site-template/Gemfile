source "https://rubygems.org"

# Promote the latest stable Jekyll and gems (re-check upstream before use);
# step back only for an actual incompatibility and record why here. The
# GitHub Pages versions page is a reference, not a ceiling:
#   https://pages.github.com/versions/
gem "jekyll", "~> 4.3"
gem "kramdown-parser-gfm"
gem "rouge"

group :jekyll_plugins do
  gem "jekyll-feed"     # generates /feed.xml automatically
  gem "jekyll-sitemap"  # generates /sitemap.xml automatically
  gem "jekyll-seo-tag"  # provides {% seo %} — used in _layouts/default.html
end

# Ruby 3+ no longer bundles webrick; `jekyll serve` needs it explicitly
gem "webrick", "~> 1.8"

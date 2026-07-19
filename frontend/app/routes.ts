import {index, route, type RouteConfig} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
  route("rules", "routes/rules.tsx"),
  route("support", "routes/support.tsx"),
  route("auth", "routes/auth.tsx"),
  route("p/:id", "routes/post.tsx"),
  route("profile", "routes/profile.tsx"),
  route("profile/update", "routes/profile-update.tsx"),
  route("search", "routes/search.tsx"),
  route("trends", "routes/trends.tsx"),
  route("u/:username", "routes/user.tsx"),
  route("u/:username/followers", "routes/followers.tsx"),
  route("u/:username/following", "routes/following.tsx"),
] satisfies RouteConfig;

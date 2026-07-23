#include "json.hpp"
#include <string>

using json = nlohmann::json;
using std::string;

bool isAnagram(string s, string t);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  string s = args[0].get<string>();
  string t = args[1].get<string>();
  return json(isAnagram(s, t)).dump();
}

#include "json.hpp"
#include <string>

using json = nlohmann::json;
using std::string;

int romanToInt(string s);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  string s = args[0].get<string>();
  return json(romanToInt(s)).dump();
}

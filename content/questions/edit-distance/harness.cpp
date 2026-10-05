#include "json.hpp"
#include <string>

using json = nlohmann::json;
using std::string;

int minDistance(string word1, string word2);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  string word1 = args[0].get<string>();
  string word2 = args[1].get<string>();
  return json(minDistance(word1, word2)).dump();
}

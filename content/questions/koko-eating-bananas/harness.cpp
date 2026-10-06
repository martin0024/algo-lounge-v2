#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

int minEatingSpeed(vector<int> &piles, int h);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> piles = args[0].get<vector<int>>();
  int h = args[1].get<int>();
  return json(minEatingSpeed(piles, h)).dump();
}

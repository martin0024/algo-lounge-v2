#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

int maxArea(vector<int> &height);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> height = args[0].get<vector<int>>();
  return json(maxArea(height)).dump();
}

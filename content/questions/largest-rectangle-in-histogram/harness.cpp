#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

int largestRectangleInHistogram(vector<int> &heights);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> heights = args[0].get<vector<int>>();
  return json(largestRectangleInHistogram(heights)).dump();
}

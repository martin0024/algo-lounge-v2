#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

vector<int> maxSlidingWindow(vector<int> &nums, int k);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> nums = args[0].get<vector<int>>();
  int k = args[1].get<int>();
  return json(maxSlidingWindow(nums, k)).dump();
}

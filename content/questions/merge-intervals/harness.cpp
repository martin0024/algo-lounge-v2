#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

vector<vector<int>> merge(vector<vector<int>> &intervals);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<vector<int>> intervals = args[0].get<vector<vector<int>>>();
  return json(merge(intervals)).dump();
}

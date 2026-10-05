#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;
using std::vector;

int candy(vector<int> &ratings);

std::string al_solve(const std::string &args_json) {
  json args = json::parse(args_json);
  vector<int> ratings = args[0].get<vector<int>>();
  return json(candy(ratings)).dump();
}

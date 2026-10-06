#include "cJSON.h"

int firstUniqChar(char *s);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  char *s = cJSON_GetArrayItem(root, 0)->valuestring;

  cJSON *out = cJSON_CreateNumber(firstUniqChar(s));
  char *result = cJSON_PrintUnformatted(out);

  cJSON_Delete(root);
  cJSON_Delete(out);
  return result;
}

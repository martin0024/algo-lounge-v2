#include "cJSON.h"

char *minWindow(char *s, char *t);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  char *s = cJSON_GetArrayItem(root, 0)->valuestring;
  char *t = cJSON_GetArrayItem(root, 1)->valuestring;

  cJSON *out = cJSON_CreateString(minWindow(s, t));
  char *result = cJSON_PrintUnformatted(out);

  cJSON_Delete(root);
  cJSON_Delete(out);
  return result;
}

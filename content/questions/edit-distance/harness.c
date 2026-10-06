#include "cJSON.h"

int minDistance(char *word1, char *word2);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  char *word1 = cJSON_GetArrayItem(root, 0)->valuestring;
  char *word2 = cJSON_GetArrayItem(root, 1)->valuestring;

  cJSON *out = cJSON_CreateNumber(minDistance(word1, word2));
  char *result = cJSON_PrintUnformatted(out);

  cJSON_Delete(root);
  cJSON_Delete(out);
  return result;
}

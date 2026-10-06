#include "cJSON.h"
#include <stdlib.h>

int candy(int *ratings, int ratingsSize);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jr = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jr);
  int *ratings = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++)
    ratings[i] = (int)cJSON_GetArrayItem(jr, i)->valuedouble;

  cJSON *out = cJSON_CreateNumber(candy(ratings, n));
  char *s = cJSON_PrintUnformatted(out);

  free(ratings);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray ji = in.get(0).getAsJsonArray();
        int[][] intervals = new int[ji.size()][];
        for (int i = 0; i < ji.size(); i++) {
            JsonArray row = ji.get(i).getAsJsonArray();
            intervals[i] = new int[row.size()];
            for (int j = 0; j < row.size(); j++) intervals[i][j] = row.get(j).getAsInt();
        }

        int[][] result = new Solution().merge(intervals);
        System.out.println(new Gson().toJson(result));
    }
}

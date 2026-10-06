import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jh = in.get(0).getAsJsonArray();
        int[] height = new int[jh.size()];
        for (int i = 0; i < jh.size(); i++) height[i] = jh.get(i).getAsInt();

        int result = new Solution().maxArea(height);
        System.out.println(new Gson().toJson(result));
    }
}
